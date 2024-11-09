const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt"); // Import bcrypt
const nodemailer = require("nodemailer");
const WebSocket = require("ws");
require("dotenv").config();
const multer = require("multer");
const cloudinary = require("./cloudinary");
const streamifier = require("streamifier");
const app = express();
const port = 3000;
const cors = require("cors");
const http = require("http");
const wsProtocol = process.env.NODE_ENV === "production" ? "wss" : "ws";
const wsPort = process.env.PORT || 8080; // Use your app's port or default to 8080
const wsUrl = `${wsProtocol}://uga-cycle-backend-1.onrender.com:${wsPort}`;
const server = http.createServer(app); // Define the HTTP server instance

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    console.log(`Received: ${message}`);
    // You can broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const jwt = require("jsonwebtoken");

mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error Connecting to MongoDB");
  });

const User = require("./models/user");
const Post = require("./models/post");
const salesPost = require("./models/sellPost");

// Endpoint to register a user
app.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password before saving the user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, phone, password: hashedPassword });
    newUser.verificationToken = crypto.randomBytes(20).toString("hex");

    await newUser.save();
    sendVerificationEmail(newUser.email, newUser.verificationToken);

    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, secretKey, {
      expiresIn: "1h",
    });

    // Return all user details including user ID and token
    const userDetails = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      verified: newUser.verified,
      token, // Add the token to the response
    };

    res
      .status(201)
      .json({ message: "Registration successful", user: userDetails });
    console.log("User registered:", userDetails);
  } catch (error) {
    console.log("Error registering user", error);
    res.status(500).json({ message: "Error registering user" });
  }
});

const sendVerificationEmail = async (email, verificationToken) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "democompany150@gmail.com",
      pass: "jonathanharkinsb466882w",
    },
  });

  const mailOptions = {
    from: "democompany150@gmail.com",
    to: email,
    subject: "Email Verification",
    text: `Please click the following link to verify your email: https://auth-db-23ly.onrender.com/verify/${verificationToken}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Error sending email", error);
  }
};

app.get("/verify/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(404).json({ message: "Invalid token" });
    }

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.log("Error verifying token", error);
    res.status(500).json({ message: "Email verification failed" });
  }
});

const generateSecretKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

const secretKey = generateSecretKey();

//  Endpoint for Users Login
app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the password matches
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Wrong password, check your password and try again",
      });
    }

    // Generate JWT token with a secret key
    const token = jwt.sign({ userId: user._id }, "your_secret_key_here", {
      expiresIn: "1d",
    });

    // Respond with the token and user information including user ID
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error during login", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Endpoint to get user profile
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};
const authenticateUser = (req, res, next) => {
  // Your authentication logic goes here
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Assuming JWT for token verification
  try {
    const decoded = jwt.verify(token, "your_secret_key");
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Endpoint to get user profile
app.get("/profile/:userId", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error while getting the profile", error);
    res.status(500).json({ message: "Error while getting the profile" });
  }
});

// DELETE endpoint to delete user account
app.delete("/deleteUser", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id; // Get userId from authenticated user context
    const { password } = req.body; // Get password from request body

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

    // Verify the password (ensure you have a method to compare passwords)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "fail", message: "Incorrect password" });
    }

    // If password is correct, delete the user
    await User.findByIdAndDelete(userId);
    res
      .status(200)
      .json({ status: "success", message: "Account deleted successfully" });
  } catch (error) {
    console.log("Error deleting user account", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete account" });
  }
});

// PATCH endpoint to update user info
app.patch("/updateUser/:userId", async (req, res) => {
  const { name, email, phone, profilePicture } = req.body;
  const userId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    if (email) {
      const existingEmailUser = await User.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingEmailUser) {
        return res.status(400).json({ error: "Email is already in use" });
      }
    }

    if (phone) {
      const existingPhoneUser = await User.findOne({
        phone,
        _id: { $ne: userId },
      });
      if (existingPhoneUser) {
        return res
          .status(400)
          .json({ error: "Phone number is already in use" });
      }
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (profilePicture) updateFields.profilePicture = profilePicture;

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to request a password reset
app.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body; // Accept either email or phone number

    const user = await User.findOne({
      $or: [{ email: identifier }, { phoneNumber: identifier }],
    });

    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists, a reset link will be sent to the provided contact.",
      });
    }

    // Generate a secure token and set expiration time
    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry

    await user.save();

    // Construct reset URL (you can include the token in the response directly)
    const resetUrl = `https://uga-cycle-backend-1.onrender.com/reset-password/${token}`;

    // Respond with the token directly (no email needed)
    res.status(200).json({
      message:
        "If an account exists, a reset link will be sent to the provided contact.",
      resetUrl, // You can also send the reset URL directly here
    });
  } catch (error) {
    console.error("Error in /forgot-password", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to reset the password (using PATCH)
app.patch("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find the user by the reset password token and check if the token has expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Token must not be expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // Hash the new password and update the user's password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined; // Clear the token
    user.resetPasswordExpires = undefined; // Clear the token expiry time

    await user.save();
    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error in /reset-password", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to upload images
app.patch("/profile-images/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageUrl } = req.body;

    // Validate the user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Update the user profile with the new image URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: imageUrl },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User image updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user image", error);
    res.status(500).json({ error: "Failed to update user image" });
  }
});

// Endpoint to create a new sales post
app.post("/create-SalePosts", async (req, res) => {
  try {
    const { companyName, telNumber, content, items, userId } = req.body;

    // Create a new sales post with additional fields
    const salepost = new salesPost({
      user: userId,
      companyName,
      telNumber,
      content,
      items, // Assuming items is an array of objects with item name and price
    });

    await salepost.save();

    // Broadcast the new sales post to all WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify({ type: "NEW_SALES_POST", post: salepost }));
      }
    });

    res.status(200).json({ message: "Sales post saved successfully" });
  } catch (error) {
    console.error("Error creating sales post:", error);
    res.status(500).json({ message: "Sales post creation failed" });
  }
});

// Endpoint for liking a post
app.put("/posts/:postId/:userId/like", async (req, res) => {
  const postId = req.params.postId;
  const userId = req.params.userId;

  try {
    const post = await Post.findById(postId).populate("user", "name");

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $addToSet: { likes: userId } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    updatedPost.user = post.user;

    res.json(updatedPost);
  } catch (error) {
    console.error("Error liking post:", error);
    res
      .status(500)
      .json({ message: "An error occurred while liking the post" });
  }
});

// Endpoint to unlike a post
app.put("/posts/:postId/:userId/unlike", async (req, res) => {
  const postId = req.params.postId;
  const userId = req.params.userId;

  try {
    const post = await Post.findById(postId).populate("user", "name");

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $pull: { likes: userId } },
      { new: true }
    );

    updatedPost.user = post.user;

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(updatedPost);
  } catch (error) {
    console.error("Error unliking post:", error);
    res
      .status(500)
      .json({ message: "An error occurred while unliking the post" });
  }
});

// Endpoint to get all posts
app.get("/get-posts", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while getting the posts" });
  }
});
// Endpoint to get all Sale posts
app.get("/get-SalePosts", async (req, res) => {
  try {
    const SalePosts = await salesPost
      .find()
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(SalePosts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while getting the Sale posts" });
  }
});
// Endpoint to get user profile
app.get("/profile/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error while getting the profile" });
  }
});

// Endpoint to create a new post
app.post("/create-post", async (req, res) => {
  try {
    const { content, userId } = req.body;

    const newPost = new Post({ user: userId, content });
    await newPost.save();

    // Notify all connected clients of the new post
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify({ type: "NEW_POST", post: newPost }));
      }
    });

    res.status(200).json({ message: "Post saved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Post creation failed" });
  }
});
// Assuming you have a Notification model
app.get("/notifications/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.params.userId });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Services
app.post("/service_regiestration", async (req, res) => {
  try {
    const {
      user,
      Service_provider_name,
      fullName,
      phoneNumber,
      registrationType,
      pickupSchedule,
      region,
      district,
    } = req.body;

    // Check if the user is already registered with this service provider
    const existingRegistration = await Registration.findOne({
      user,
      Service_provider_name,
    });

    if (existingRegistration) {
      return res.status(400).json({
        message: "You have already registered with this provider.",
      });
    }

    // If no existing registration, create a new one
    const registration = new Registration({
      user,
      Service_provider_name,
      fullName,
      phoneNumber,
      registrationType,
      pickupSchedule,
      region,
      district,
    });

    await registration.save();
    res
      .status(201)
      .json({ message: "Registration created successfully", registration });
  } catch (error) {
    res.status(400).json({ message: "Failed to create registration", error });
  }
});

// get services
app.get("/service_regiestration", async (req, res) => {
  try {
    const registrations = await Registration.find().populate("user"); // populate to fetch user details
    res.status(200).json(registrations);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve registrations", error });
  }
});

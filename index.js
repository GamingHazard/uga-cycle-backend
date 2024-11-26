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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const jwt = require("jsonwebtoken");
app.use(cors());

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

// Configure multer to accept image files
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}); // Limit file size to 5MB

const User = require("./models/user");
const Admin = require("./models/admins");
const Post = require("./models/post");
const Tips = require("./models/tip");
const Services = require("./models/services");
const salesPost = require("./models/sellPost");

// Endpoint to register an admin
app.post("/admin-register", async (req, res) => {
  try {
    const { role, name, organization, email, phone, password } = req.body;

    const existingUser = await Admin.findOne({ email, organization, phone });
    if (existingUser) {
      return res.status(400).json({ message: "already registered" });
    }

    // Hash the password before saving the user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Admin({
      role,
      name,
      organization,
      email,
      phone,
      password: hashedPassword,
    });
    newUser.verificationToken = crypto.randomBytes(20).toString("hex");

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, secretKey, {
      expiresIn: "1h",
    });

    // Return all user details including user ID and token
    const userDetails = {
      id: newUser._id,
      role: newUser.role,
      name: newUser.name,
      organization: newUser.organization,
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
// Endpoint to register a user
app.post("/register", async (req, res) => {
  try {
    const { role, name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password before saving the user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      role,
      name,
      email,
      phone,
      password: hashedPassword,
    });
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
      role: newUser.role,
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

//  Endpoint for admin Login
app.post("/admin-login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or phone
    const user = await Admin.findOne({
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
        role: user.role,
        name: user.name,
        organization: user.organization,
        email: user.email,
        profilePicture: user.profilePicture,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error during login", error);
    res.status(500).json({ message: "Login failed" });
  }
});
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
        role: user.role,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
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

app.patch("/updateUser/:userId", async (req, res) => {
  const { name, email, phone, profilePicture } = req.body;
  const userId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // Check if email or phone already exists for another user
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

    const updateFields = { name, email, phone };

    // Upload the profile picture to Cloudinary if provided
    if (profilePicture) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(
          profilePicture,
          {
            folder: "profile_pictures", // Optional: specify folder
          }
        );
        updateFields.profilePicture = uploadResponse.secure_url;
      } catch (error) {
        console.error("Cloudinary upload error:", error);
        return res
          .status(500)
          .json({ error: "Failed to upload profile picture" });
      }
    }

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
    console.error("Update user error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Endpoint to update user profile picture
app.patch("/updateProfilePicture/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { profilePicture } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile picture updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: "Error updating profile picture" });
  }
});

// DELETE endpoint to delete user account
app.delete("/deleteUser/:userId", async (req, res) => {
  try {
    const userId = req.params.userId; // Get userId from URL
    const deleteUser = await User.findByIdAndDelete(userId);

    if (!deleteUser) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

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

// Endpoint to reset password
app.patch("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user with the provided token and check if it is still valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired." });
    }

    // Update the user's password and clear the reset token
    user.password = password; // Note: Storing plaintext passwords is not secure
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Save the updated user
    await user.save();

    res
      .status(200)
      .json({ message: "Password has been updated successfully." });
  } catch (error) {
    console.error("Error in /reset-password/:token", error);
    res.status(500).json({ message: "Server error" });
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
    const post = await Post.findById(postId).populate(
      "user",
      "name  profilePicture"
    );

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
    const post = await Post.findById(postId).populate(
      "user",
      "name  profilePicture"
    );

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

// Endpoint to get all Sale posts
app.get("/get-SalePosts", async (req, res) => {
  try {
    const SalePosts = await salesPost
      .find()
      .populate("user", "name profilePicture")
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

// Endpoint to get all posts
app.get("/get-posts", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name  profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while getting the posts" });
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

// Endpoint to create services
app.post("/service_registration", async (req, res) => {
  try {
    // Extract the required fields from the request body
    const {
      company,
      fullName,
      email,
      serviceType,
      phoneNumber,
      region,
      district,
      registrationType,
      pickupSchedule,
      wasteType,
      location,
      userId,
    } = req.body;
    status = "Not Approved";
    // Step 1: Check if the user is already registered under the same company
    const existingService = await Services.findOne({
      user: userId,
      company: company, // Check if the same company exists for this user
    });

    if (existingService) {
      // Response if the service already exists for the user in the same company
      return res.status(400).json({
        message: "You are already registered under this company.",
      });
    }

    // Step 2: Create a new service entry with the extracted data
    const newService = new Services({
      company,
      fullName,
      email,
      serviceType,
      phoneNumber,
      region,
      district,
      registrationType,
      pickupSchedule,
      wasteType,
      location,
      status,
      user: userId, // Reference to the User model
    });

    // Step 3: Save the new service entry to the database
    await newService.save();

    // Response after successful service registration
    res.status(200).json({
      message: "Service registered successfully",
      serviceDetails: {
        id: newService._id, // Include the ID of the newly created service
        company,
        fullName,
        email,
        serviceType,
        phoneNumber,
        region,
        district,
        registrationType,
        pickupSchedule,
        wasteType,
        location,
        status,
        userId,
      },
    });

    console.log("New service registered:", newService);
  } catch (error) {
    console.error("Error during service registration:", error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Service registration failed", error: error.message });
  }
});

// Endpoint to fetch all registered services
app.get("/services", async (req, res) => {
  try {
    // Fetch all services from the database
    const services = await Services.find().populate(
      "user",
      "name email  profilePicture"
    );

    // Check if services exist
    if (services.length === 0) {
      return res.status(404).json({
        message: "No services found.",
      });
    }

    // Response with the fetched services
    res.status(200).json({
      message: "Services fetched successfully",
      services: services.map((service) => ({
        id: service._id,
        company: service.company,
        fullName: service.fullName,
        email: service.email,
        serviceType: service.serviceType,
        phoneNumber: service.phoneNumber,
        region: service.region,
        district: service.district,
        registrationType: service.registrationType,
        pickupSchedule: service.pickupSchedule,
        wasteType: service.wasteType,
        location: service.location,
        userId: service.user,
        date: service.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching services:", error); // Log the error for debugging
    res.status(500).json({
      message: "Failed to fetch services",
      error: error.message,
    });
  }
});

// Endpoint to fetch only approved services
app.get("/services/approved", async (req, res) => {
  try {
    // Fetch services with status "approved"
    const approvedServices = await Services.find({
      status: "Approved",
    }).populate("user", "name email profilePicture");

    // Check if any approved services exist
    if (approvedServices.length === 0) {
      return res.status(404).json({
        message: "No approved services found.",
      });
    }

    // Respond with the approved services
    res.status(200).json({
      message: "Approved services fetched successfully",
      services: approvedServices.map((service) => ({
        id: service._id,
        company: service.company,
        fullName: service.fullName,
        email: service.email,
        serviceType: service.serviceType,
        phoneNumber: service.phoneNumber,
        region: service.region,
        district: service.district,
        registrationType: service.registrationType,
        pickupSchedule: service.pickupSchedule,
        wasteType: service.wasteType,
        location: service.location,
        userId: service.user,
        date: service.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching approved services:", error); // Log error for debugging
    res.status(500).json({
      message: "Failed to fetch approved services",
      error: error.message,
    });
  }
});

// Endpoint to fetch all services with status "notApproved"
app.get("/services/not-approved", async (req, res) => {
  try {
    // Fetch all services with status "notApproved"
    const services = await Services.find({ status: "Not Approved" }).populate(
      "user",
      "name email profilePicture"
    );

    // Check if services exist
    if (services.length === 0) {
      return res.status(404).json({
        message: "No unapproved Customers found.",
      });
    }

    // Response with the fetched services
    res.status(200).json({
      message: "Unapproved services fetched successfully",
      services: services.map((service) => ({
        id: service._id,
        company: service.company,
        fullName: service.fullName,
        email: service.email,
        serviceType: service.serviceType,
        phoneNumber: service.phoneNumber,
        region: service.region,
        district: service.district,
        registrationType: service.registrationType,
        pickupSchedule: service.pickupSchedule,
        wasteType: service.wasteType,
        location: service.location,
        userId: service.user,
        date: service.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching unapproved services:", error); // Log the error for debugging
    res.status(500).json({
      message: "Failed to fetch unapproved services",
      error: error.message,
    });
  }
});

// Endpoint for approving a user
app.put("/services/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Services.findByIdAndUpdate(
      id,
      { status: "Approved" },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: "Service approved successfully", service });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to unlike a post
app.put("/services/:id/disapprove", async (req, res) => {
  try {
    const { id } = req.params;

    // Update the status to "notApproved"
    const service = await Services.findByIdAndUpdate(
      id,
      { status: "Not Approved" },
      { new: true } // Return the updated document
    );

    // Check if the service exists
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: "Service disapproved successfully", service });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to delete a service by ID
app.delete("/delete-service/:id", async (req, res) => {
  try {
    // Extract the service ID from the request parameters
    const { id } = req.params;

    // Step 1: Find the service by its ID and delete it
    const deletedService = await Services.findByIdAndDelete(id);

    if (!deletedService) {
      // Response if the service with the given ID does not exist
      return res.status(404).json({
        message: "Service not found",
      });
    }

    // Response after successful deletion
    res.status(200).json({
      message: "Service deleted successfully",
      serviceDetails: deletedService,
    });

    console.log("Service deleted:", deletedService);
  } catch (error) {
    console.error("Error during service deletion:", error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Service deletion failed", error: error.message });
  }
});

// Endpoint to create a new tip
app.post("/create-tip", async (req, res) => {
  try {
    const { content, userId } = req.body;

    const newPost = new Tips({ user: userId, content });
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

// Endpoint to get all tips
app.get("/get-tips", async (req, res) => {
  try {
    const posts = await Tips.find()
      .populate("user", "name  profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while getting the posts" });
  }
});

// Endpoint for liking a tip
app.put("/tips/:postId/:userId/like", async (req, res) => {
  const postId = req.params.postId;
  const userId = req.params.userId;

  try {
    const post = await Tips.findById(postId).populate(
      "user",
      "name  profilePicture"
    );

    const updatedPost = await Tips.findByIdAndUpdate(
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

// Endpoint to unlike a tip
app.put("/tips/:postId/:userId/unlike", async (req, res) => {
  const postId = req.params.postId;
  const userId = req.params.userId;

  try {
    const post = await Tips.findById(postId).populate(
      "user",
      "name  profilePicture"
    );

    const updatedPost = await Tips.findByIdAndUpdate(
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

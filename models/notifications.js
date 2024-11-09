// notificationService.js
const { Expo } = require("expo-server-sdk");

// Create a new Expo SDK client
let expo = new Expo();

const sendPushNotification = async (token, message) => {
  // Create the messages to send
  let messages = [{ title: "Post" }, { body: "You have new posts " }];

  if (!Expo.isExpoPushToken(token)) {
    console.error(`Invalid Expo push token: ${token}`);
    return;
  }

  messages.push({
    to: token,
    sound: "default",
    title: message.title,
    body: message.body,
    data: { someData: message.data },
  });

  // Send notifications
  let ticketChunk = await expo.sendPushNotificationsAsync(messages);
  console.log("Push notification tickets: ", ticketChunk);
};

module.exports = { sendPushNotification };

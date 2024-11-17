const ws = new WebSocket("ws://127.0.0.1:8000");
const app = document.getElementById("app");

ws.onopen = () => {
  console.log("WebSocket connection established");
  ws.send(
    JSON.stringify({ type: "update", ref: "testLabel", data: "Hello, server!" })
  );
};

ws.onmessage = event => {
  const message = JSON.parse(event.data);

  console.log("Received message:", message);

  switch (message.type) {
    // A hydration message is sent by the server to update the DOM
    case "hydrate":
      app.innerHTML = message.data;
      break;
    default:
      console.error("Unknown message type:", message.type);
  }
};

ws.onclose = () => {
  console.log("WebSocket connection closed");
};

function run(func) {
  ws.send(JSON.stringify({ type: "run", data: func.toString() }));
}

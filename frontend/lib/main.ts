import type { WSMessage } from "../../common/types.ts";

export interface CustomWindow extends Window {
  $run: (func: string) => void;
}

export declare let window: CustomWindow;

export const makeClient = (parent: string, url: string | URL) => {
  const app = document.querySelector(parent);
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("WebSocket connection established");
    ws.send(
      JSON.stringify({
        event: "update",
        ref: "testLabel",
        data: "Hello, server!",
      })
    );
  };

  ws.onmessage = event => {
    const message: WSMessage = JSON.parse(event.data);

    console.log("Received message:", message);

    switch (message.event) {
      // A hydration message is sent by the server to update the DOM
      case "hydrate":
        handleHydrate(message.data);
        break;
      case "update":
        if (message.ref) handleUpdate(message.ref, message.data);
        else console.error("No ref provided for update event");
        break;
      default:
        console.error("Unknown message event:", message.event);
    }
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };

  const handleHydrate = (data: string) => {
    app!.innerHTML = data;
  };

  const handleUpdate = (ref: string, data: string) => {
    const element = document.querySelector(`[data-ref="${ref}"]`);

    if (element) {
      element.innerHTML = data;
    } else {
      console.error(`Element with ref ${ref} not found`);
    }
  };
  // expose the $run function to the window object
  window.$run = (func: string) => {
    ws.send(JSON.stringify({ event: "run", data: func.toString() }));
  };
};

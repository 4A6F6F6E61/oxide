import type { WSEvent, WSMessage } from "../../common/types.ts";

export class State<T> {
  private uuid: string;
  constructor(private ws: WebSocket, private value: T) {
    this.uuid = Math.random().toString(36).substring(7);
  }

  public get() {
    return this.value;
  }

  public set(value: T) {
    this.value = value;
    this.ws.send(
      JSON.stringify({ event: "update", ref: this.uuid, data: value })
    );
  }

  public toString() {
    return `<span data-ref="${this.uuid}">${this.value}</span>`;
  }
}

export type Functions = {
  $state: <T>(value: T) => State<T>;
  /**
   * Send a message to the client
   * @param message The WebSocket message to send
   * @returns void
   */
  $send: (message: WSMessage) => void;
  $socket: () => WebSocket;
  /**
   * Listen for a specific message event
   * @param event The event to listen for
   * @param callback The callback to run when the event is received
   */
  $message: (event: string, callback: (data: string) => void) => void;
  /**
   * Helper to register a function that can be called from the client
   * @param _callback function body
   * @returns The callable reference to the function
   */
  $func: <T>(name: string, body: () => T) => () => T;
};

export const makeServer = (
  port: number,
  hostname: string,
  callback: (helpers: Functions) => string
) => {
  Deno.serve({ port, hostname }, req => {
    if (req.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", () => {
      const $send = (message: WSMessage): void => {
        socket.send(JSON.stringify(message));
      };
      const $message = (event: string, _callback: (data: string) => void) => {
        socket.addEventListener("message", e => {
          const message = JSON.parse(e.data);
          if (message.event === event) {
            _callback(message.data);
          }
        });
      };

      console.log("a client connected!");

      const functions = new Map<string, <T>() => T>();

      const html = callback({
        $state: <T>(value: T) => new State<T>(socket, value),
        $send,
        $socket: () => socket,
        $message,
        $func: <T>(name: string, body: () => T): (() => T) => {
          if (functions.has(name)) {
            throw new Error(`Function ${name} already exists`);
          }
          functions.set(name, body as <T>() => T);
          return body;
        },
      });
      $message("run", func => {
        console.log("Running function:", func);

        const f = functions.get(func) ?? (() => {});
        f();
      });
      $send({ event: "hydrate", data: html });
    });
    return response;
  });
};

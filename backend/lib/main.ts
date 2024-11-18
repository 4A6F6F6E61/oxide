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

interface Component {
  render(helper: Helper): string;
}

class Test implements Component {
  render({ $state }: Helper): string {
    const counter = $state(666);

    return /*html*/ `
      <div>Test State: ${counter}<div>
    `;
  }
}

export type Helper = {
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
  $message: (event: WSEvent, callback: (data: string) => void) => void;
  /**
   * Helper to register a function that can be called from the client
   * @param _callback function body
   * @returns The callable reference to the function
   */
  $func: <T>(name: string, body: () => T) => () => T;
};

export type Function = <T>() => T;

export const makeServer = (
  port: number,
  hostname: string,
  callback: (helpers: Helper) => string
) => {
  Deno.serve({ port, hostname }, req => {
    if (req.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", () => {
      console.log("a client connected!");

      const $state = make$state(socket);
      const $send = make$send(socket);
      const $socket = () => socket;
      const $message = make$message(socket);
      const functions = new Map<string, Function>();
      const $func = make$func(functions);

      const html = callback({
        $state,
        $send,
        $socket,
        $message,
        $func,
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

const make$state =
  <T>(socket: WebSocket) =>
  <T>(value: T) =>
    new State<T>(socket, value);

const make$send = (socket: WebSocket) => (message: WSMessage) => {
  socket.send(JSON.stringify(message));
};

const make$message =
  (socket: WebSocket) =>
  (event: WSEvent, _callback: (data: string) => void) => {
    socket.addEventListener("message", e => {
      const message = JSON.parse(e.data);
      if (message.event === event) {
        _callback(message.data);
      }
    });
  };

const make$func =
  (functions: Map<string, Function>) =>
  <T>(name: string, body: () => T): (() => T) => {
    if (functions.has(name)) {
      throw new Error(`Function ${name} already exists`);
    }
    functions.set(name, body as <T>() => T);
    return body;
  };

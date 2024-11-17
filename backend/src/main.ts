class State<T> {
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

type WSEvent = "hydrate" | "update" | "run";

type Functions = {
  $state: <T>(value: T) => State<T>;
  $send: (event: WSEvent, data: string) => void;
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
  $func: <T>(body: () => T) => () => T;
};

const makeServer = (
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
      const $send = (event: WSEvent, data: string): void => {
        socket.send(JSON.stringify({ event, data }));
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

      const html = callback({
        $state: <T>(value: T) => new State<T>(socket, value),
        $send,
        $socket: () => socket,
        $message,
        $func: <T>(body: () => T): (() => T) => {
          // TODO: Add register logic here
          return body;
        },
      });
      $message("run", func => {
        console.log("Running function:", func);

        console.log(self);
      });
      $send("hydrate", html);
    });
    return response;
  });
};

makeServer(8000, "0.0.0.0", ({ $state, $message }) => {
  const counter = $state(1);

  // self.increment = () => {
  //   counter.set(counter.get() + 1);
  // };

  return /*html*/ `
    <div>Counter: ${counter}<div>
    <button onclick="$run('increment')">Increment</button>
  `;
});

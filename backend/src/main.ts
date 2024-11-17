import { makeServer } from "./make_server.ts";

makeServer(8000, "0.0.0.0", ({ $state }) => {
  const counter = $state(1);

  // self.increment = () => {
  //   counter.set(counter.get() + 1);
  // };

  return /*html*/ `
    <div>Counter: ${counter}<div>
    <button onclick="$run('increment')">Increment</button>
  `;
});

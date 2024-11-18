import { makeServer } from "../lib/main.ts";

makeServer(8000, "0.0.0.0", ({ $state, $func }) => {
  const counter = $state(1);

  const increment = $func("increment", () => {
    counter.set(counter.get() + 1);
  });

  $func("incBy3", () => {
    increment();
    increment();
    increment();
  });

  return /*html*/ `
    <div>Counter: ${counter}<div>
    <button onclick="$run('increment')">Increment</button>
    <button onclick="$run('incBy3')">Increment by 3</button>
  `;
});

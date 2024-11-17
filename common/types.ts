export type WSEvent = "hydrate" | "update" | "run";

export type WSMessage = {
  event: WSEvent;
  ref?: string;
  data: string;
};

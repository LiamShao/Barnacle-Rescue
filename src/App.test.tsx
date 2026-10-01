import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import * as sessions from "./state/rescueSession";
import { SAVE_KEY } from "./state/persistence";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

it("shows a recoverable error when preparation fails without mounting a scene or saving success", () => {
  localStorage.clear();
  vi.spyOn(sessions, "prepareRescueSession").mockImplementation(() => { throw new Error("impossible layout"); });
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Start rescue" }));
  fireEvent.click(screen.getByRole("button", { name: /^Zen$/ }));
  fireEvent.click(screen.getByRole("button", { name: /Whole Turtle Care/ }));
  expect(screen.getByRole("alert")).toHaveTextContent("couldn't get ready");
  expect(container.querySelector("canvas")).toBeNull();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).completions).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: "Choose another rescue" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: /Gentle Start/ })).toBeVisible();
});

import { render } from "preact";
import "./styles/index.css";
import { App } from "./App";
import { popupHeight, uiScale } from "./ui-scale";

// Set before the first render so the popup opens at its final size.
const scale = uiScale(window.screen.availHeight);
const root = document.documentElement;
root.style.zoom = String(scale);
root.style.setProperty("--popup-height", `${popupHeight(scale)}px`);
render(<App />, document.getElementById("app")!);

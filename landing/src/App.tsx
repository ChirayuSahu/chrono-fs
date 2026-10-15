import Atmosphere from "./components/Atmosphere";
import Masthead from "./components/Masthead";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import {
  Boot,
  Console,
  Edges,
  Nomenclature,
  Pipeline,
  Storage,
} from "./components/sections";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { useLenis } from "./hooks/useLenis";

export default function App() {
  useScrollReveal();
  useLenis();

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Atmosphere />
      <Masthead />
      <main id="main">
        <Hero />
        <Storage />
        <Pipeline />
        <Nomenclature />
        <Console />
        <Edges />
        <Boot />
      </main>
      <Footer />
    </>
  );
}

import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { Examples } from "./components/examples";
import { ApiSection } from "./components/api-section";
import { Stats } from "./components/demo-window";
import { Footer } from "./components/footer";
import { LiveCursors } from "./components/live-cursors";

export default function MarketingPage() {
  return (
    <LiveCursors>
      <Nav />
      <Hero />
      <Examples />
      <ApiSection />
      <Stats />
      <Footer />
    </LiveCursors>
  );
}

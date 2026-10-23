import TimeRail from "./TimeRail";
import CopyCommand from "./CopyCommand";
import { INSTALL_CMD } from "../install";

export default function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="wrap hero__grid">
        <div>
          <p className="eyebrow">Userspace filesystem · C · FUSE</p>
          <h1 className="hero__title" id="hero-title">
            The past is
            <br />a <em>directory</em>.
          </h1>
          <p className="lede">
            ChronoFS versions every write on a normal Linux mount. You never commit. You
            never change your apps. You just read yesterday at{" "}
            <b>mnt/.snapshots/2min-ago/</b>.
          </p>
          <div className="actions">
            <a className="btn btn--solid" href="#rail">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v5h5" strokeLinecap="round" />
              </svg>
              Rewind the rail
            </a>
            <a className="btn btn--ghost" href="#boot">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M4 5h16v12H4z" />
                <path d="M8 21h8M12 17v4" strokeLinecap="round" />
              </svg>
              Build it
            </a>
          </div>

          <CopyCommand command={INSTALL_CMD} label="Install on Linux" />
        </div>

        <aside className="specplate" aria-label="At a glance">
          <p className="specplate__title">
            Store · specification <b>v1.0</b>
          </p>
          <dl>
            <dt>block</dt>
            <dd>4 KiB</dd>
            <dt>hash</dt>
            <dd>SHA-256</dd>
            <dt>journal rec</dt>
            <dd>1096 B</dd>
            <dt>dedup</dt>
            <dd>
              <b>2.00×</b>
            </dd>
            <dt>cache hits</dt>
            <dd>
              <b>66.6%</b>
            </dd>
            <dt>source</dt>
            <dd>~3,500 lines C</dd>
            <dt>kernel module</dt>
            <dd>none</dd>
          </dl>
        </aside>
      </div>

      <TimeRail />
    </section>
  );
}

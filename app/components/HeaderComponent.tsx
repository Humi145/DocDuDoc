import Image from "next/image";
import Link from "next/link";

export default function HeaderComponent() {
  return (
    <header>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
              <Image
              src="/iconic.png"
              alt="Ginko Logo"
              width={60}
              height={60}
            />
          </Link>
          <h1 className=" rounded-md text-lg font-semibold text-(--foreground)">
            La doc du Doc
          </h1>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <a
              href="#"
              className="inline-flex text-(--text) items-center rounded-md border-2 border-(--primary) bg-(--background) px-6 py-3 text-base shadow-sm transition-colors hover:bg-(--primary) hover:text-white">
                Correspondants
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
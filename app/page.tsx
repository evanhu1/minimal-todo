import { TodoApp } from "@/components/TodoApp";

// A single static page. Everything interactive lives in the client component.
export default function Home() {
  return (
    <main className="mx-auto min-h-full w-full max-w-2xl px-4 py-8 sm:py-12">
      <TodoApp />
    </main>
  );
}

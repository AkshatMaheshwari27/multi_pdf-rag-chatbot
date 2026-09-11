import Chat from "@/app/components/Chat";
import PdfUploader from "@/app/components/PdfUploader";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Multi-PDF RAG Chatbot
          </h1>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">
            Upload PDFs, then ask questions. Answers are grounded in your
            documents, with sources cited for every response.
          </p>
        </div>

        <PdfUploader />
        <Chat />
      </main>
    </div>
  );
}

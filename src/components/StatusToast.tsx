import clsx from "clsx";

export type StatusToastState = {
  type: "success" | "error";
  message: string;
};

export function StatusToast({ status }: { status: StatusToastState }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className={clsx(
          "rounded-md px-5 py-2 text-sm font-semibold text-white",
          status.type === "success" ? "bg-emerald-600" : "bg-[#b3261e]",
        )}
      >
        {status.message}
      </div>
    </div>
  );
}

import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
}

export default function AddPatientButton({
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-xl
        bg-gradient-to-r
        from-blue-600
        to-indigo-600
        px-5
        py-3
        text-sm
        font-semibold
        text-white
        shadow-lg
        shadow-blue-500/20
        transition-all
        duration-200
        hover:from-blue-700
        hover:to-indigo-700
        hover:shadow-blue-500/30
        active:scale-[0.98]
        focus:outline-none
        focus:ring-4
        focus:ring-blue-100
      "
    >
      <Plus
        size={18}
        strokeWidth={2.2}
      />

      Add Patient
    </button>
  );
}
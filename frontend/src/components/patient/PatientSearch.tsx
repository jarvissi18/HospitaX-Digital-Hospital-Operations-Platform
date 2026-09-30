import {
  Search,
  X,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function PatientSearch({
  value,
  onChange,
}: Props) {
  return (
    <div className="relative w-full lg:w-[360px]">

      <Search
        size={17}
        className="
          pointer-events-none
          absolute
          left-3.5
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
      />

      <input
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder="Search name, mobile, disease..."
        className="
          w-full
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          py-2.5
          pl-10
          pr-10
          text-sm
          text-slate-800
          outline-none
          transition

          placeholder:text-slate-400

          hover:border-slate-300

          focus:border-blue-400
          focus:bg-white
          focus:ring-4
          focus:ring-blue-50
        "
      />

      {value && (
        <button
          type="button"
          onClick={() =>
            onChange("")
          }
          className="
            absolute
            right-3
            top-1/2
            flex
            -translate-y-1/2
            items-center
            justify-center
            rounded-md
            p-1
            text-slate-400
            transition
            hover:bg-slate-200
            hover:text-slate-700
          "
        >
          <X size={15} />
        </button>
      )}

    </div>
  );
}
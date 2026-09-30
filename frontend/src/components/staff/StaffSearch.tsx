import {
  Search,
  X,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function UserSearch({
  value,
  onChange,
}: Props) {
  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="relative w-full">
      {/* Search Icon */}
      <Search
        size={18}
        strokeWidth={2}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="Search staff by name or email..."
        aria-label="Search staff"
        className="
          h-11
          w-full
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          pl-10
          pr-10
          text-sm
          font-medium
          text-slate-800
          outline-none
          transition-all
          duration-200
          placeholder:text-slate-400
          hover:border-slate-300
          focus:border-blue-400
          focus:bg-white
          focus:ring-4
          focus:ring-blue-50
        "
      />

      {/* Clear Button */}
      {value.trim() && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear search"
          className="
            absolute
            right-3
            top-1/2
            flex
            h-6
            w-6
            -translate-y-1/2
            items-center
            justify-center
            rounded-md
            text-slate-400
            transition
            hover:bg-slate-100
            hover:text-slate-700
          "
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
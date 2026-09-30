import LoginBanner from "../../components/auth/LoginBanner";
import LoginCard from "../../components/auth/LoginCard";

export default function Login() {
  return (
    <div className="relative h-screen min-h-[620px] overflow-hidden bg-[#071A3A]">
      {/* =====================================================
          GLOBAL BACKGROUND
      ===================================================== */}

      <div className="absolute inset-0 bg-[#071A3A]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      {/* Ambient Glow */}
      <div className="absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full bg-blue-500/15 blur-[140px]" />

      <div className="absolute -bottom-52 left-[42%] h-[560px] w-[560px] rounded-full bg-cyan-400/10 blur-[150px]" />

      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1800px]">
        {/* =================================================
            LEFT — PRODUCT INTRODUCTION
        ================================================= */}

        <div className="hidden h-full min-h-0 lg:flex lg:w-[55%]">
          <LoginBanner />
        </div>

        {/* =================================================
            RIGHT — LOGIN
        ================================================= */}

        <div
          className="
            flex
            h-full
            min-h-0
            w-full
            items-center
            justify-center
            px-4
            py-5
            sm:px-6
            lg:w-[45%]
            lg:px-8
            lg:py-6
            xl:px-12
          "
        >
          <LoginCard />
        </div>
      </div>
    </div>
  );
}
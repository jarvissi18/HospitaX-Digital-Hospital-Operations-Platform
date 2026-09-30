import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[#F5F8FC]">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className="
          fixed
          inset-y-0
          left-0
          z-40
          hidden
          w-[280px]
          shrink-0
          lg:block
        "
      >
        <Sidebar />
      </aside>


      {/* =====================================================
          APPLICATION CONTENT
      ===================================================== */}

      <div
        className="
          ml-0
          flex
          h-screen
          min-h-0
          min-w-0
          flex-1
          flex-col
          overflow-hidden
          lg:ml-[280px]
        "
      >

        <main
          className="
            min-h-0
            min-w-0
            flex-1
            overflow-hidden
            bg-[#F5F8FC]
          "
        >

          <div
            className="
              h-full
              min-h-0
              overflow-hidden
              p-4
              sm:p-5
              lg:p-6
              xl:p-7
            "
          >

            <div
              className="
                h-full
                min-h-0
                overflow-hidden
              "
            >
              <Outlet />
            </div>

          </div>

        </main>

      </div>

    </div>
  );
}
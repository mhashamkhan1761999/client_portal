import { useState, useEffect } from "react";
import dayjs from "dayjs";
import supabase from "@/lib/supabaseClient";
import { toast } from "sonner";

type FollowUp = {
  id: string;
  reminder_date: string;
  note: string;
  is_completed: boolean;
  user_id: string;
  clients?: { client_name: string } | null;
  users?: { name: string }[] | null;
  added_by?: string;
};

export default function UpcomingFollowUps() {
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState("");
  const [actionType, setActionType] = useState<"done" | "delete" | "reschedule" | null>(null);
  const [newDate, setNewDate] = useState(""); // For rescheduling

  // Fetch only future follow-ups
  const fetchUpcomingFollowUps = async () => {
    const { data: followUps, error } = await supabase
      .from("follow_ups")
      .select(`
        id,
        reminder_date,
        note,
        is_completed,
        user_id,
        clients(client_name),
        users:user_id(name)
      `)
      .gt("reminder_date", new Date().toISOString()) // future only
      .order("reminder_date", { ascending: true });

    if (!error && followUps) {
      const mergedData: FollowUp[] = followUps
        .map((fu: any) => ({
          ...fu,
          added_by: fu.users && fu.users.length > 0 ? fu.users[0].name : "Unknown",
        }))
        .slice(0, 2); // UI ke liye top 2 future follow-ups

      setUpcomingFollowUps(mergedData);
    } else {
      console.error(error);
    }
  };


  // Open modal for action
  const openReasonModal = (
    followUp: FollowUp,
    type: "done" | "delete" | "reschedule"
  ) => {
    setSelectedFollowUp(followUp);
    setActionType(type);
    setReason("");
    setNewDate("");
    setShowReasonModal(true);
  };

  // Handle action save
  const handleSaveReason = async () => {
    if (!reason.trim() || !selectedFollowUp || !actionType) return;

    try {
      if (actionType === "done") {
        const { error } = await supabase
          .from("follow_ups")
          .update({ is_completed: true, action_reason: reason })
          .eq("id", selectedFollowUp.id);
        if (!error) {
          toast.success("Follow-up marked as done ✅");
          setUpcomingFollowUps((prev) =>
            prev.filter((f) => f.id !== selectedFollowUp.id)
          );
        }
      }

      if (actionType === "delete") {
        const { error } = await supabase
          .from("follow_ups")
          .delete()
          .eq("id", selectedFollowUp.id);
        if (!error) {
          toast.success("Follow-up deleted 🗑");
          setUpcomingFollowUps((prev) =>
            prev.filter((f) => f.id !== selectedFollowUp.id)
          );
        }
      }

      if (actionType === "reschedule") {
        if (!newDate) return;
        const { error } = await supabase
          .from("follow_ups")
          .update({ reminder_date: newDate, action_reason: reason })
          .eq("id", selectedFollowUp.id);
        if (!error) {
          toast.success("Follow-up rescheduled 📅");
          fetchUpcomingFollowUps();
        }
      }

      setShowReasonModal(false);
    } catch (err) {
      console.error("Error handling action:", err);
      toast.error("Something went wrong ❌");
    }
  };

  useEffect(() => {
    fetchUpcomingFollowUps();
  }, []);

  return (
    <div className="space-y-4 mb-10">
      {upcomingFollowUps.length === 0 ? (
        <div className="text-sm text-gray-400 text-center">
          No upcoming follow-ups.
        </div>
      ) : (
        upcomingFollowUps.map((item) => (
          <div
            key={item.id}
            className="bg-[#1f1f1f]/60 border border-[#333] backdrop-blur-sm p-5 rounded-xl shadow-md hover:shadow-lg hover:border-[#c29a4b]/60 transition-all duration-300"
          >
            {/* Top Row */}
            <div className="flex justify-between items-start mb-3">
              {/* Client Info */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#c29a4b]/10 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-[#c29a4b]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5.121 17.804A13.937 13.937 0 0112 15c2.21 0 4.304.535 6.121 1.481M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase">Client</div>
                  <div className="text-[#c29a4b] font-semibold text-lg">
                    {item.clients?.client_name || "Unknown Client"}
                  </div>
                </div>
              </div>

              {/* Reminder Date */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#c29a4b]/10 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-[#c29a4b]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10m-7 4h4m-9 5h14a2 2 0 002-2V7a2 2 0 00-2-2h-2V3H8v2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase">Reminder Date</div>
                  <div className="text-white text-sm">
                    {dayjs(item.reminder_date).format("MMM D, YYYY [at] h:mm A")}
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="mt-2">
              <div className="text-xs text-gray-400 uppercase mb-1 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m-3-14a9 9 0 100 18 9 9 0 000-18z"
                  />
                </svg>
                Note
              </div>
              <div className="text-sm text-gray-300 italic">{item.note || "-"}</div>
            </div>

            {/* Added By */}
            {item.added_by && (
              <div className="mt-3 text-xs text-gray-500">
                Added by: <span className="text-gray-300">{item.added_by}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                className="text-green-500 hover:text-green-400"
                onClick={() => openReasonModal(item, "done")}
              >
                ✅ Done
              </button>
              <button
                className="text-red-500 hover:text-red-400"
                onClick={() => openReasonModal(item, "delete")}
              >
                🗑 Delete
              </button>
              <button
                className="text-blue-500 hover:text-blue-400"
                onClick={() => openReasonModal(item, "reschedule")}
              >
                📅 Reschedule
              </button>
            </div>
          </div>
        ))
      )}

      {/* Reason Modal */}
      {showReasonModal && selectedFollowUp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4 capitalize">{actionType} follow-up</h3>

            {/* Reschedule Input */}
            {actionType === "reschedule" && (
              <input
                type="datetime-local"
                className="border w-full p-2 rounded mb-4"
                value={newDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setNewDate(e.target.value)}
              />
            )}

            <textarea
              className="border w-full p-2 rounded mb-4"
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setShowReasonModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleSaveReason}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

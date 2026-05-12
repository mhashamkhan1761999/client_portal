'use client';

import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { formatFollowUpTime } from "@/lib/followUpTime";

interface FollowUp {
  id: string;
  client_name: string;
  reminder_date: string;
  note: string;
  action_reason: string | null;
}

const FollowUpNotifier: React.FC = () => {
  const { user } = useAuth();
  const [dueFollowUps, setDueFollowUps] = useState<FollowUp[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalFollowUp, setModalFollowUp] = useState<FollowUp | null>(null);
  const [useLocalAcknowledgments, setUseLocalAcknowledgments] = useState(false);
  const [followUpsUnavailable, setFollowUpsUnavailable] = useState(false);

  const getLocalAckKey = (followUpId: string) => `follow-up-ack:${user?.id}:${followUpId}`;

  useEffect(() => {
    if (!user || followUpsUnavailable) return;

    const checkFollowUps = async () => {
      const now = new Date().toISOString();

      // fetch follow-ups for this user which are not completed
      const { data, error } = await supabase
        .from("follow_ups")
        .select(`
          id,
          client_id,
          clients:client_id(client_name),
          reminder_date,
          note,
          action_reason,
          is_completed
        `)
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .lte("reminder_date", now);

      if (error) {
        const isMissingFollowUpsTable =
          error.code === "PGRST205" ||
          error.code === "42P01" ||
          (error.message || "").includes("follow_ups");

        if (isMissingFollowUpsTable) {
          console.warn("Follow-up notifications are disabled because the follow_ups table is not available.");
          setFollowUpsUnavailable(true);
          return;
        }

        return console.error(error);
      }

      const unacknowledged: FollowUp[] = [];

      for (let fu of data || []) {
        const clientRelation = fu.clients as { client_name?: string } | { client_name?: string }[] | null;

        let isAcknowledged = false;

        if (useLocalAcknowledgments) {
          isAcknowledged = localStorage.getItem(getLocalAckKey(fu.id)) === "true";
        } else {
          const { data: ackData, error: ackError } = await supabase
            .from("follow_up_acknowledgments")
            .select("id")
            .eq("follow_up_id", fu.id)
            .eq("user_id", user.id);

          if (ackError) {
            console.error("Error checking follow-up acknowledgment:", ackError);
            setUseLocalAcknowledgments(true);
            isAcknowledged = localStorage.getItem(getLocalAckKey(fu.id)) === "true";
          } else {
            isAcknowledged = Boolean(ackData && ackData.length > 0);
          }
        }

        if (!isAcknowledged) {
          unacknowledged.push({
            id: fu.id,
            client_name: Array.isArray(clientRelation)
              ? clientRelation?.[0]?.client_name || "Unknown"
              : clientRelation?.client_name || "Unknown",
            reminder_date: fu.reminder_date,
            note: fu.note || "",
            action_reason: fu.action_reason
          });
        }
      }

      if (unacknowledged.length > 0) {
        setDueFollowUps(unacknowledged);
        // show first follow-up in modal
        setModalFollowUp(unacknowledged[0]);
        setShowModal(true);

        // Chrome notification
        unacknowledged.forEach(fu => {
          if (Notification.permission === "granted") {
            new Notification("Follow-up Due", {
              body: `Follow-up with ${fu.client_name} is due now!`,
            });
          }
        });
      }
    };

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    checkFollowUps();
    const interval = setInterval(checkFollowUps, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, useLocalAcknowledgments, followUpsUnavailable]);

  const acknowledgeFollowUp = async (fu: FollowUp) => {
    if (!user) return;

    if (useLocalAcknowledgments) {
      localStorage.setItem(getLocalAckKey(fu.id), "true");
    } else {
      const { error } = await supabase.from("follow_up_acknowledgments").insert({
        follow_up_id: fu.id,
        user_id: user.id,
        triggered_by: null,
      });

      if (error) {
        console.error("Error saving follow-up acknowledgment:", error);
        setUseLocalAcknowledgments(true);
        localStorage.setItem(getLocalAckKey(fu.id), "true");
      }
    }

    toast.success(`Acknowledged follow-up for ${fu.client_name}`);
    setDueFollowUps((prev) => prev.filter((item) => item.id !== fu.id));
    setShowModal(false);
    setModalFollowUp(null);
  };

  return (
    <>
      {/* Modal */}
      {showModal && modalFollowUp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-2">Follow-up Due!</h2>
            <p><b>Client:</b> {modalFollowUp.client_name}</p>
            <p><b>Date:</b> {formatFollowUpTime(modalFollowUp.reminder_date, 'YYYY-MM-DD h:mm A')}</p>
            <p><b>Last Note / Action:</b> {modalFollowUp.action_reason || modalFollowUp.note}</p>

            <div className="flex justify-end mt-4 space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => acknowledgeFollowUp(modalFollowUp)}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FollowUpNotifier;

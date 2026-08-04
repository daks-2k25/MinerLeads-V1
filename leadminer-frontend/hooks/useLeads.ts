import { useCallback, useState } from "react";
import { Lead } from "@/src/models/lead";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const carregarLeads = useCallback(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then(setLeads);
  }, []);

  return { leads, setLeads, carregarLeads };
}

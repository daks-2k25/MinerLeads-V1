import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiConfig";
import { Lead } from "@/src/models/lead";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const carregarLeads = useCallback(() => {
    fetch(`${API_BASE_URL}/api/leads`)
      .then((res) => res.json())
      .then(setLeads);
  }, []);

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  return { leads, setLeads, carregarLeads };
}

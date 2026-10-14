"use client";

import { useCallback, useEffect, useState } from "react";
import { loadInbox, loadProfile, loadSharePrefs, saveInbox, saveProfile, saveSharePrefs } from "@/lib/storage";
import { EMPTY_PROFILE, type Profile, type ReceivedCard, type SharePrefs } from "@/lib/types";
import { DEFAULT_SHARE_PREFS } from "@/lib/types";

export function useLocalStore() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [prefs, setPrefs] = useState<SharePrefs>(DEFAULT_SHARE_PREFS);
  const [inbox, setInbox] = useState<ReceivedCard[]>([]);

  useEffect(() => {
    setProfile(loadProfile());
    setPrefs(loadSharePrefs());
    setInbox(loadInbox());
    setReady(true);
  }, []);

  const updateProfile = useCallback((next: Profile) => {
    setProfile(next);
    saveProfile(next);
  }, []);

  const updatePrefs = useCallback((next: SharePrefs) => {
    setPrefs(next);
    saveSharePrefs(next);
  }, []);

  const updateInbox = useCallback((next: ReceivedCard[]) => {
    setInbox(next);
    saveInbox(next);
  }, []);

  return { ready, profile, prefs, inbox, updateProfile, updatePrefs, updateInbox };
}

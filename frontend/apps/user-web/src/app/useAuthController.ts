import { FormEvent, useEffect, useState } from "react";

import { AuthApi, AuthUser } from "@notesheep/api-client";
import { applyTheme, readStoredTheme, storeTheme, ThemeName } from "@notesheep/ui";

import { messages } from "../messages";
import { AuthMode } from "./types";

export function useAuthController(authApi: AuthApi) {
  const [theme, setTheme] = useState<ThemeName>(() => readStoredTheme());
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((response) => {
        if (!cancelled) {
          setUser(response.user);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authApi]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 6) {
      setError(messages.auth.shortPassword);
      return;
    }

    setSubmitting(true);
    try {
      const response =
        mode === "login"
          ? await authApi.login({ username, password })
          : await registerThenLogin(authApi, username, password);
      setUser(response.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.auth.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await authApi.logout();
    setUser(null);
    setPassword("");
  }

  function toggleMode() {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  }

  return {
    error,
    handleLogout,
    handleSubmit,
    isSubmitting,
    mode,
    password,
    setPassword,
    setTheme,
    setUsername,
    theme,
    toggleMode,
    user,
    username,
  };
}

async function registerThenLogin(api: AuthApi, username: string, password: string) {
  await api.register({ username, password });
  return api.login({ username, password });
}

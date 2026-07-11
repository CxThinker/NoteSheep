import { useMemo } from "react";

import { AuthApi, HttpAuthApi } from "@notesheep/api-client";

import { AppShell } from "./app/AppShell";
import { AuthScreen } from "./app/AuthScreen";
import { readScrollbarState } from "./app/scrollbar";
import { useAuthController } from "./app/useAuthController";
import { useWorkspaceController } from "./app/useWorkspaceController";

type AppProps = {
  api?: AuthApi;
};

export { readScrollbarState };

export function App({ api }: AppProps) {
  const authApi = useMemo(() => api ?? new HttpAuthApi(), [api]);
  const auth = useAuthController(authApi);
  const workspace = useWorkspaceController(authApi, Boolean(auth.user));

  if (auth.user) {
    return (
      <AppShell
        {...workspace}
        language={auth.language}
        neonTextColor={auth.neonTextColor}
        onLanguageChange={auth.setLanguage}
        onLogout={auth.handleLogout}
        onNeonTextColorChange={auth.setNeonTextColor}
        onThemeChange={auth.setTheme}
        theme={auth.theme}
        user={auth.user}
      />
    );
  }

  return (
    <AuthScreen
      error={auth.error}
      isSubmitting={auth.isSubmitting}
      mode={auth.mode}
      onPasswordChange={auth.setPassword}
      onSubmit={auth.handleSubmit}
      onThemeChange={auth.setTheme}
      onToggleMode={auth.toggleMode}
      onUsernameChange={auth.setUsername}
      password={auth.password}
      theme={auth.theme}
      username={auth.username}
    />
  );
}

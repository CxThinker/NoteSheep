import { THEMES } from "@notesheep/ui";

import { messages } from "../messages";
import { AuthMode } from "./types";

type AuthScreenProps = {
  error: string;
  isSubmitting: boolean;
  mode: AuthMode;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onThemeChange: (value: (typeof THEMES)[number]["name"]) => void;
  onToggleMode: () => void;
  onUsernameChange: (value: string) => void;
  theme: (typeof THEMES)[number]["name"];
  username: string;
};

export function AuthScreen({
  error,
  isSubmitting,
  mode,
  password,
  onPasswordChange,
  onSubmit,
  onThemeChange,
  onToggleMode,
  onUsernameChange,
  theme,
  username,
}: AuthScreenProps) {
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">NS</div>
          <div>
            <p className="eyebrow">{messages.appName}</p>
            <h1 id="auth-title">{mode === "login" ? messages.auth.loginTitle : messages.auth.registerTitle}</h1>
          </div>
        </div>

        <p className="subtitle">{messages.auth.subtitle}</p>
        <div className="theme-switcher" aria-label="主题">
          {THEMES.map((item) => (
            <button className="theme-button" data-active={theme === item.name} key={item.name} onClick={() => onThemeChange(item.name)} type="button">
              {item.label}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>{messages.auth.username}</span>
            <input autoComplete="username" name="username" onChange={(event) => onUsernameChange(event.target.value)} required value={username} />
          </label>
          <label>
            <span>{messages.auth.password}</span>
            <input autoComplete={mode === "login" ? "current-password" : "new-password"} name="password" onChange={(event) => onPasswordChange(event.target.value)} required type="password" value={password} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-action" disabled={isSubmitting} type="submit">
            {mode === "login" ? messages.auth.login : messages.auth.register}
          </button>
        </form>

        <button className="text-action" onClick={onToggleMode} type="button">
          {mode === "login" ? messages.auth.switchToRegister : messages.auth.switchToLogin}
        </button>
      </section>
    </main>
  );
}

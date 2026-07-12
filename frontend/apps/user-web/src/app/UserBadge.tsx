type UserBadgeProps = {
  username: string;
};

export function UserBadge({ username }: UserBadgeProps) {
  const initial = Array.from(username.trim())[0]?.toLocaleUpperCase() ?? "";

  return (
    <div className="shell-user" title={username}>
      <span aria-hidden="true" className="shell-user-avatar">{initial}</span>
      <span className="shell-user-name">{username}</span>
    </div>
  );
}

// Where a record is listed: the mobile app, the website, or both.
export default function ChannelBadges({ channels }) {
  if (!channels?.app && !channels?.website) {
    return <span className="adm-badge adm-badge--chan-off">Hidden</span>;
  }
  return (
    <span className="adm-flags">
      {channels.app && <span className="adm-badge adm-badge--chan">App</span>}
      {channels.website && <span className="adm-badge adm-badge--chan">Web</span>}
    </span>
  );
}

// Replaces src/platform.ts in the phone build
export const IS_PHONE_APP = true;

interface LbPhoneGlobals {
  fetchNui(event: string): Promise<{ code?: string } | undefined>;
  onNuiEvent?: (event: string, handler: () => void) => void;
}

const lbPhone = globalThis as unknown as LbPhoneGlobals;

// Lua keeps the room from the notification button until the app can read it, so the
// same path works whether the button opened the app or found it already open
export const subscribeToInvites = (onInvite: (roomCode: string) => void) => {
  const readInvite = () => {
    lbPhone.fetchNui('josky:pendingInvite')
      .then(invite => {
        if (invite?.code) onInvite(invite.code);
      })
      .catch(() => {});
  };

  if (lbPhone.onNuiEvent) {
    lbPhone.onNuiEvent('joskyInvite', readInvite);
  } else {
    window.addEventListener('message', event => {
      if (event.data?.action === 'joskyInvite') readInvite();
    });
  }
  readInvite();
};

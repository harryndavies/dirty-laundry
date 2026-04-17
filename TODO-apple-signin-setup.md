# Sign in with Apple — Config Steps

Code is wired up. These steps are blocked on your Apple Developer enrollment. Do them in order once enrollment clears, before archiving the app for TestFlight.

## 1. Apple Developer — enable Sign in with Apple on the App ID

- developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers**
- Find/create the App ID for bundle `club.dirtylaundry.app`
- Tick **Sign In with Apple** → Configure → "Enable as a primary App ID" → Save

## 2. Apple Developer — create a Sign in with Apple key

- Keys → **+** → name it `DirtyLaundry SIWA`
- Tick **Sign in with Apple**, configure → pick the App ID above, Save
- Download the `.p8` file (one-time — you CANNOT re-download it) and note the **Key ID** (10 chars)
- Find your **Team ID** (top right of the developer portal)

## 3. Supabase — configure the Apple provider

Supabase Dashboard → **Authentication** → **Providers** → **Apple** → Enable:

| Field | Value |
|---|---|
| Client IDs | `club.dirtylaundry.app` |
| Secret Key (for OAuth) | Paste the contents of the `.p8` file |
| Services ID (optional) | leave blank unless you add web OAuth later |
| Team ID | your 10-char Apple Team ID |
| Key ID | the 10-char key ID from step 2 |

Save.

## 4. Xcode — re-enable the capability

The entitlement is currently blank in `ios/App/App/App.entitlements` because free/personal Apple teams can't use Sign in with Apple (Xcode fails to generate a provisioning profile). Once your paid membership is active:

- App target → **Signing & Capabilities** → **+ Capability** → **Sign in with Apple**
- Xcode will write the entry into `App.entitlements` automatically. You should end up with:

```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

## 5. Test

1. Run on a real iPhone (simulator sometimes flakes on Apple auth)
2. Log out → tap **CONTINUE WITH APPLE** on the auth screen
3. Confirm with Face ID / Touch ID
4. On first sign-in, Apple shows your name and offers to hide your email — pick "Share My Email" for testing
5. You should land in the app signed in. Check Supabase Dashboard → Authentication → Users — a new row with `provider = apple`

## Gotcha: the display_name quirk

Apple only gives you the user's name on the **very first** sign-in. Our code in `src/context/AuthContext.tsx` captures it and writes it to `profiles.display_name`. If a user uninstalls + reinstalls, Apple won't send the name again, and we'll fall back to whatever the profile trigger populated. That's fine — existing users keep the name they already had.

## App Store review notes

The reviewer will need to test Sign in with Apple. Update the reviewer notes in `APP-STORE-SUBMISSION.md` to mention it's now the primary sign-in method; the existing guest/email paths still work as fallbacks.

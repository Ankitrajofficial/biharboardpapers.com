/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
interface ImportMetaEnv {
  readonly VITE_ANALYTICS_PROVIDER?: string;
  readonly VITE_ANALYTICS_DOMAIN?: string;
  readonly VITE_ANALYTICS_SCRIPT?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
}

// The app's data API. Demo (in-memory) unless a Supabase project is configured
// in .env.local, then the real backend. Reads always come from the shared store.
import { backendEnabled } from '../lib/supabase';
import * as fake from './fake';
import * as remote from './remote';

export const demoMode = !backendEnabled;
const api = backendEnabled ? remote : fake;

export const {
  sendPhoneCode, signInWithPhone, signInAs, signOut,
  createItem, setItemHidden, deleteItem,
  toggleFavourite, saveSearch, toggleSearchAlerts, deleteSavedSearch,
  startConversation, sendMessage, markConversationRead, makeOffer, respondOffer,
  quote, checkout, cancelOrder, markShipped, devMarkDelivered, confirmReceived, leaveFeedback, openClaim,
  markNotificationsRead, submitIdVerification, devApproveId, devReconcileCod, savePayoutMethod, requestPayout,
  updateProfile, saveAddress, setBundleDiscounts, deleteAccount, report, toggleBlock,
} = api;

/** At app start: restore the saved session (backend) — nothing to do in demo mode. */
export const restoreSession = backendEnabled ? remote.restoreSession : async () => {};

export {
  ApiError, useStore, searchItems,
  selectBundleDiscounts, selectCategories, selectClaim, selectConversation, selectConversations, selectFavourites, selectFeed,
  selectFeedbackFor, selectIdVerification, selectIsBlocked, selectIsFavourite, selectItem, selectItems, selectLastMessage, selectLedger,
  selectMe, selectMessages, selectMyAddress, selectMyFeedbackOn, selectMyOrders, selectNotifications, selectOffer, selectOrder,
  selectPayoutMethods, selectPayouts, selectProfile, selectSavedSearches, selectUnreadCount, selectWallet, selectWardrobe,
} from './fake';

import axios from 'axios';
import { showAlert } from './alerts';

const stripe = stripe(
  'pk_test_51MvcKZSJzDLBIXdROf5oKSqNbDSiYBNADfBbsQRF6jLtlkfTTrqmXm0SYc4ynT53DPKcYCG15cJB2eYfdlWKFg6Y00KXqImRmS'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      session: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

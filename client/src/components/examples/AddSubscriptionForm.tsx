import AddSubscriptionForm from '../AddSubscriptionForm';

export default function AddSubscriptionFormExample() {
  return (
    <AddSubscriptionForm
      onSubmit={(data) => console.log('New subscription:', data)}
      isLoading={false}
    />
  );
}
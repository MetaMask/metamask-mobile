export default function migrate(state) {
  if (state.recents) {
    delete state.recents;
  }
  return state;
}

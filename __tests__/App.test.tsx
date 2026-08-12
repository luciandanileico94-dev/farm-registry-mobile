import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import App from '../App';

describe('Field Registry', () => {
  it('switches the simulated connection status when the user presses the control', async () => {
    const { getByText, getByLabelText, queryByText } = await render(<App />);

    expect(getByText('Conexiune simulată: online')).toBeTruthy();

    await fireEvent.press(getByLabelText('Comută conexiunea simulată'));

    expect(getByText('Conexiune simulată: offline')).toBeTruthy();
    expect(queryByText('Conexiune simulată: online')).toBeNull();
  });
});

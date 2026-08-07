import { createWidget } from 'expo-widgets';
import { createMetaMaskWidget } from './createMetaMaskWidget.ios';

describe('createMetaMaskWidget (ios)', () => {
  it('delegates to expo-widgets createWidget with the given name and layout', () => {
    const layout = jest.fn();

    createMetaMaskWidget('TestWidget', layout);

    expect(createWidget).toHaveBeenCalledWith('TestWidget', layout);
  });

  it('returns a widget exposing updateSnapshot/updateTimeline/reload', () => {
    const widget = createMetaMaskWidget('TestWidget', jest.fn());

    widget.updateSnapshot({ foo: 'bar' });
    widget.reload();

    expect(widget.updateSnapshot).toHaveBeenCalledWith({ foo: 'bar' });
    expect(widget.reload).toHaveBeenCalled();
  });
});

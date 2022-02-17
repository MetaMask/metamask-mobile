import React, { Component, ComponentClass } from 'react';
import Engine from '../../../core/Engine';
import { IQRState } from './types';

const withQRHardwareAwareness = (
	Children: ComponentClass<{
		QRState?: IQRState;
		isSigningQRObject?: boolean;
		isSyncingQRHardware?: boolean;
	}>
) => {
	class QRHardwareAwareness extends Component<any, any> {
		state: {
			QRState: IQRState;
		} = {
			QRState: {
				sync: {
					reading: false,
				},
				sign: {},
			},
		};

		componentDidMount() {
			const { KeyringController } = Engine.context as any;
			KeyringController.getQRKeyringState().then((store: any) => {
				store.subscribe((value: any) => {
					this.setState({
						QRState: value,
					});
				});
			});
		}

		render() {
			return (
				<Children
					{...this.props}
					isSigningQRObject={!!this.state.QRState.sign?.request}
					isSyncingQRHardware={this.state.QRState.sync.reading}
					QRState={this.state.QRState}
				/>
			);
		}
	}
	return QRHardwareAwareness;
};

export default withQRHardwareAwareness;

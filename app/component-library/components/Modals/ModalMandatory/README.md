# ModalMandatory

Modal Mandatory is a modal component typically used when confirmation option is the only needed. An example of it's use it's on the UserTermsModal

## Props

### 'headerTitle'

String, Modal header title, this props receive the translation of the title

### 'footerHelpText'

String, Footer help tex, this props receive the translation of the footer help text, it's optional.

### 'buttonDisabled'

Boolean, it represents the disable props of the button on this Modal, it's optional and the default value is false.
Also have a logic to change the button background color to muted if the prop value is true.

### 'buttonText'

String, it represents the button text.

### 'onPress'

Function, represents the action of pressing the button

### 'children'

React Node, represents the body of the modal, all the info and extra logic should go here.

Feature: The Internet Guinea Pig Website

  @androidApp
  Scenario Outline: Verify text input on demo app
    Given I am on the demo page
    When I input <input> in textfield
    Then I should see <message> in textfield
    Examples:
      | input        | message      |
      | Hello World! | Hello World! |
      | Hello World! | Hi World     |

  @iosApp
  Scenario: Launch Settings app of an iphone
    Given I launch the settings app of iphone
    Then I should see the general label

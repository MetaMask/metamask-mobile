import { useNavigation } from "@react-navigation/native";
import Text from "../../../../../component-library/components/Texts/Text";
import ScreenView from "../../../../Base/ScreenView";
import { Box } from "../../../Box/Box";
import { useEffect } from "react";
import { getBridgeTransactionDetailsNavbar } from "../../../Navbar";

export const BridgeTransactionDetails = () => {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(getBridgeTransactionDetailsNavbar(navigation));
  }, [navigation]);

  return (
    <ScreenView>
      <Box>
        <Text>Transaction Details</Text>
      </Box>
    </ScreenView>
  );
};

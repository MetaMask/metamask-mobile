import { useContext } from "react";
import { Stake, StakeContext } from "../sdk/stakeSdkProvider";

export const useStakeContext = () => {
    const context = useContext(StakeContext);
    return context as Stake;
};

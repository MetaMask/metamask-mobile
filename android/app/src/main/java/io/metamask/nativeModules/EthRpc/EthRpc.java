package io.metamask.nativeModules.EthRpc;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;

import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.DynamicArray;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.Contract;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.DefaultGasProvider;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class EthRpc extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "EthRpc";
    private static final String ABI = "[{\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"fallback\"},{\"constant\":true,\"inputs\":[{\"name\":\"user\",\"type\":\"address\"},{\"name\":\"token\",\"type\":\"address\"}],\"name\":\"tokenBalance\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"users\",\"type\":\"address[]\"},{\"name\":\"tokens\",\"type\":\"address[]\"}],\"name\":\"balances\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256[]\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"}]";

    public EthRpc(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getBalances(String infuraUrl, String contractAddress, String userAddress, ReadableArray tokenAddresses, Promise promise) {
        try {
            Web3j web3j = Web3j.build(new HttpService(infuraUrl));

            List<String> tokens = new ArrayList<>();
            for (int i = 0; i < tokenAddresses.size(); i++) {
                tokens.add(tokenAddresses.getString(i));
            }

            Function function = new Function(
                    "balances",
                    Arrays.asList(
                        new DynamicArray<>(Address.class, Collections.singletonList(new Address(userAddress))),
                        new DynamicArray<>(Address.class, tokens.stream().map(Address::new).toArray(Address[]::new))
                    ),
                    Collections.singletonList(new TypeReference<DynamicArray<Uint256>>() {})
            );

            String encodedFunction = FunctionEncoder.encode(function);

            EthCall ethCall = web3j.ethCall(
                    Transaction.createEthCallTransaction(null, contractAddress, encodedFunction),
                    DefaultBlockParameterName.LATEST
            ).send();

            List<Type> results = FunctionReturnDecoder.decode(ethCall.getValue(), function.getOutputParameters());

            if (results.size() > 0 && results.get(0) instanceof DynamicArray) {
                @SuppressWarnings("unchecked")
                List<Uint256> balances = ((DynamicArray<Uint256>) results.get(0)).getValue();
    
                WritableMap nonZeroBalances = Arguments.createMap();
                for (int i = 0; i < tokens.size(); i++) {
                    BigInteger balance = balances.get(i).getValue();
                    if (balance.compareTo(BigInteger.ZERO) > 0) {
                        String tokenAddress = tokens.get(i);
                        WritableMap bigNumberFormat = new WritableNativeMap();
                        bigNumberFormat.putString("_hex", "0x" + balance.toString(16));
                        bigNumberFormat.putBoolean("_isBigNumber", true);
                        nonZeroBalances.putMap(tokenAddress, bigNumberFormat);
                    }
                }

                promise.resolve(nonZeroBalances);
            } else {
                promise.resolve(Arguments.createMap());
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}
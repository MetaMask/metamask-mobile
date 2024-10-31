package io.metamask.nativeModules.EthRpc;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;

import org.json.JSONArray;
import org.json.JSONObject;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.http.HttpService;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.DynamicArray;
import org.web3j.abi.TypeReference;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public class EthRpc extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "EthRpc";

    public EthRpc(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getBalances(String infuraUrl, String contractAddress, String userAddress, ReadableArray tokenAddresses, String abiJson, Promise promise) {
        try {
            Web3j web3j = Web3j.build(new HttpService(infuraUrl));

            List<Address> users = Collections.singletonList(new Address(userAddress));

            List<Address> tokens = new ArrayList<>();
            for (int i = 0; i < tokenAddresses.size(); i++) {
                tokens.add(new Address(tokenAddresses.getString(i)));
            }

            // Debugging logs
            System.out.println("Users: " + users);
            System.out.println("Tokens: " + tokens);

            // Parse the ABI JSON to get the function definition
            JSONArray abiArray = new JSONArray(abiJson);
            JSONObject functionAbi = null;
            for (int i = 0; i < abiArray.length(); i++) {
                JSONObject abiObject = abiArray.getJSONObject(i);
                if (abiObject.has("name") && abiObject.getString("name").equals("balances")) {
                    functionAbi = abiObject;
                    break;
                }
            }

            if (functionAbi == null) {
                promise.reject("Error", "Function 'balances' not found in ABI");
                return;
            }

            Function function = new Function(
                "balances",
                Arrays.asList(new DynamicArray<>(Address.class, users), new DynamicArray<>(Address.class, tokens)),
                Collections.singletonList(new TypeReference<DynamicArray<Uint256>>() {})
            );

            String encodedFunction = FunctionEncoder.encode(function);

            Transaction transaction = Transaction.createEthCallTransaction(
                userAddress,
                contractAddress,
                encodedFunction
            );

            CompletableFuture<EthCall> ethCall = web3j.ethCall(transaction, DefaultBlockParameterName.LATEST).sendAsync();
            ethCall.thenAccept(result -> {
                List<Type> decodedResult = FunctionReturnDecoder.decode(result.getValue(), function.getOutputParameters());
                List<Uint256> balances = (List<Uint256>) decodedResult.get(0).getValue();
                List<String> balanceStrings = new ArrayList<>();
                for (Uint256 balance : balances) {
                    balanceStrings.add(balance.getValue().toString());
                }
                promise.resolve(balanceStrings);
            }).exceptionally(e -> {
                promise.reject("Error", e);
                return null;
            });
        } catch (Exception e) {
            promise.reject("Error", e);
        }
    }
}
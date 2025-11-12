graph TD

%% Nodes outside subgraphs %%
RUN[Runway] -->|every 2 weeks| CURRENT0
CURRENT1 --> |create PR| bump1[GitHub Action creates version bump PR for the main branch]
bump1 -->|merge PR| MAIN1
CURRENT6 --> BUG1[A bug is found]
BUG1 --> BUG2[A fix is done on 'main' branch]
BUG2 --> CURRENT7
FEAT[For every change, new features or fixes, engineers first open PRs on 'main'] -->|merge PR| MAIN1

%% Subgraphs %%
subgraph Main [Main developement branch: 'main']
    style Main fill:#4d0808,stroke:#000,stroke-width:2px,color:#fff
    MAIN1[All changes are first made on 'main' branch]
end

subgraph Previous [Previous release branch: 'release/x.y-1.z']
    style Previous fill:#08084d,stroke:#000,stroke-width:2px,color:#fff
    PREVIOUS1[Previous release is merged into 'stable' branch]
    PREVIOUS1 --> PREVIOUS2['Stable Branch Sync' GitHun Action creates stable sync PR]
    PREVIOUS2 -->|create PR| PREVIOUS3[Release engineer reviews and merges stable sync PR]
    PREVIOUS3 -->|merge PR| MAIN1
end

subgraph HotFix [Hotfix release branch: 'release/x.y-1.z+1']
    style HotFix fill:#08084d,stroke:#000,stroke-width:2px,color:#fff
    HOTFIX1[Hot fix release is merged into 'stable' branch]
    HOTFIX1 --> HOTFIX2['Stable Branch Sync' GitHun Action creates stable sync PR]
    HOTFIX2 -->|create PR| HOTFIX3[Release engineer reviews and merges stable sync PR]
    HOTFIX3 -->|merge PR| MAIN1
end

subgraph Current [Current release branch: 'release/x.y.z']
    style Current fill:#08084d,stroke:#000,stroke-width:2px,color:#fff
    CURRENT0[Runway automatically creates a new release branch based off of 'main' branch, called 'release/x.y.z']
    CURRENT0 --> CURRENT1['Create Release Pull Request' GitHub Action is automatically executed]
    CURRENT1 -->|create PR| changelog1[GitHub Action creates x.y.z changelog PR]
    CURRENT1 --> CURRENT2[GitHub Action creates x.y.z release PR in stable]
    changelog1 -->|update PR| changelog2[Release Engineer reviews, adjusts, and merges x.y.z changelog PR]
    changelog2 -->|merge PR| CURRENT4
    CURRENT2 --> CURRENT5
    CURRENT3[Release Engineer creates and merges stable sync PR into 'release/x.y.z branch'] -->|merge PR| CURRENT4
    CURRENT4[A commit is added to 'release/x.y.z' branch] --> CURRENT5[A new release build is automatically created and posted on the x.y.z release PR by Bitrise]
    CURRENT5 --> CURRENT6[Release is tested by all teams]
    PREVIOUS1 --> CURRENT3
    HOTFIX1 --> CURRENT3
    CURRENT7[Release Engineer cherry-picks fixes on 'release/x.y.z' branch]
    CURRENT6 --> CURRENT8[Release is approved by all teams]
    CURRENT7 --> CURRENT8
    CURRENT8 --> CURRENT9[Release is approved by Release Engineer, Release QA, and Release Manager]
    CURRENT9 --> CURRENT10[Release is submitted to Store by Runway]
    CURRENT10 --> CURRENT11[Release tag is added on the release branch automatically via Runway]
    CURRENT11 --> CURRENT12[Release engineer merges x.y.z release PR into 'stable' branch]
end

subgraph Stable [Release branch: 'release/x.y.z']
    style Stable fill:#26084d,stroke:#000,stroke-width:2px,color:#fff
    CURRENT12 -->|merge PR| STABLE1[A new production build is automatically created and posted on the repo's releases page]
    STABLE1 --> STABLE2[Release Engineer submits x.y.z production build to the store]
end

subgraph Next [Next release branch: 'release/x.y+1.z']
    style Next fill:#08084d,stroke:#000,stroke-width:2px,color:#fff
    STABLE2 --> NEXT1[Runway automatically creates a new release branch from main, called 'release/x.y+1.z']
end
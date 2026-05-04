# Unit 1: Process Synchronization & Deadlocks (Detailed Revision)

## Part A: Process Synchronization

### 1. Background
When multiple processes execute concurrently, they may share data or resources. Without controlled access, this can lead to **data inconsistency**.
*   **Race Condition:** A situation where several processes access and manipulate the same data concurrently, and the final value of the data depends on the specific order of execution.
*   **Goal of Synchronization:** To coordinate execution such that no two processes can manipulate shared data at the exact same time, thus preventing race conditions.

### 2. The Critical-Section Problem
A **Critical Section (CS)** is a specific segment of code in a process where shared variables, tables, or files are being accessed or modified.
*   **The Problem:** Design a protocol that processes can use to cooperate. A process must ask permission to enter its CS in the **entry section**, execute the CS, and then exit through the **exit section**, followed by the **remainder section**.

**Three mandatory requirements for a valid solution:**
1.  **Mutual Exclusion:** If process $P_i$ is executing in its CS, no other processes can be executing in their CS.
2.  **Progress:** If no process is executing in its CS and some processes wish to enter, only those processes not in their remainder sections can participate in deciding who enters next. This selection cannot be postponed indefinitely. (No deadlock among waiting processes).
3.  **Bounded Waiting:** There exists a limit (bound) on the number of times other processes are allowed to enter their critical sections after a process has made a request to enter its CS and before that request is granted. (No starvation).

### 3. Two-Process Solution: Peterson's Solution
A classic software-based solution restricted to two processes ($P_0$ and $P_1$) alternating execution between their critical and remainder sections.
*   **Shared Variables:**
    *   `int turn;` // Indicates whose turn it is to enter the CS.
    *   `boolean flag[2];` // flag[i] = true implies $P_i$ is ready to enter its CS.

**Algorithm for Process $P_i$ (where $j$ is the other process):**
```c
do {
    flag[i] = true;         // I want to enter
    turn = j;               // But I'll let the other process go first if it wants
    while (flag[j] && turn == j); // Wait if the other process wants to enter AND it is its turn

    /* CRITICAL SECTION */

    flag[i] = false;        // I am done, exit section

    /* REMAINDER SECTION */
} while (true);
```
*   *Why it works:* It satisfies Mutual Exclusion (both can't be in the while loop and exit it simultaneously), Progress, and Bounded Waiting.

### 4. Multiple-Process Solutions (e.g., Bakery Algorithm)
Extending Peterson's to $n$ processes requires complex software algorithms like Lamport's Bakery Algorithm.
*   **Concept:** Similar to a bakery, customers (processes) take a ticket. The customer with the lowest ticket number gets served first. If two processes take the exact same ticket number, the process with the smaller Process ID ($PID$) gets priority.

### 5. Synchronization Hardware
Software solutions are complex and can be interrupted. Modern systems provide hardware support for synchronization.
*   **Memory Barriers / Fences:** Instructions that force any changes in memory to be propagated to all other processors immediately.
*   **Hardware Instructions (Atomic):** Instructions executed as one uninterruptible unit.
    *   **TestAndSet:** Reads a boolean variable and sets it to true atomically.
        ```c
        boolean TestAndSet(boolean *target) {
            boolean rv = *target;
            *target = true;
            return rv;
        }
        ```
    *   **CompareAndSwap:** Swaps values only if a specified condition is met.
        ```c
        int CompareAndSwap(int *value, int expected, int new_value) {
            int temp = *value;
            if (*value == expected)
                *value = new_value;
            return temp;
        }
        ```
*   **Mutex Locks (Spinlocks):** Using the above instructions, OS designers build Mutex (Mutual Exclusion) locks. A process must `acquire()` the lock before entering CS and `release()` it after. If the lock is unavailable, the process "spins" (loops continuously), causing a **Spinlock** which wastes CPU cycles but avoids context-switch overhead.

### 6. Semaphores
A more robust synchronization tool provided by the OS, which avoids busy waiting (spinning).
*   A Semaphore `S` is an integer variable accessed only through two standard **atomic** operations: `wait()` and `signal()` (historically `P()` and `V()`).

**Standard Definition:**
```c
wait(S) {
    while (S <= 0)
        ; // busy wait
    S--;
}

signal(S) {
    S++;
}
```

**Semaphore Implementation avoiding Busy Waiting:**
Instead of spinning, a process that cannot acquire a semaphore blocks itself (goes to a waiting queue).
```c
typedef struct {
    int value;
    struct process *list; // wait queue
} semaphore;

wait(semaphore *S) {
    S->value--;
    if (S->value < 0) {
        add this process to S->list;
        block(); // suspend execution
    }
}

signal(semaphore *S) {
    S->value++;
    if (S->value <= 0) {
        remove a process P from S->list;
        wakeup(P); // resume execution
    }
}
```
*   **Binary Semaphore:** Value can only be 0 or 1. Used similarly to mutex locks.
*   **Counting Semaphore:** Value can range over an unrestricted domain. Used to manage access to a resource with $N$ instances. Initialize semaphore to $N$.

### 7. Classic Problems of Synchronization

These problems are used to test nearly every newly proposed synchronization scheme.

#### A. The Bounded-Buffer (Producer-Consumer) Problem
*   **Shared Data:** `semaphore mutex = 1;` (controls access to buffer), `semaphore empty = n;` (counts empty slots), `semaphore full = 0;` (counts full slots).

**Producer Process:**
```c
do {
    // produce an item
    wait(empty);   // wait until an empty slot is available
    wait(mutex);   // acquire lock on buffer

    /* add item to buffer */

    signal(mutex); // release lock
    signal(full);  // increment number of full slots
} while (true);
```

**Consumer Process:**
```c
do {
    wait(full);    // wait until a full slot is available
    wait(mutex);   // acquire lock on buffer

    /* remove item from buffer */

    signal(mutex); // release lock
    signal(empty); // increment number of empty slots
    
    // consume the item
} while (true);
```

#### B. The Readers-Writers Problem
*   **Shared Data:** `semaphore rw_mutex = 1;` (common to both reader and writer), `semaphore mutex = 1;` (protects `read_count`), `int read_count = 0;`.

**Writer Process:**
```c
do {
    wait(rw_mutex); // wait until no readers or writers

    /* writing is performed */

    signal(rw_mutex);
} while (true);
```

**Reader Process:**
```c
do {
    wait(mutex);
    read_count++;
    if (read_count == 1) 
        wait(rw_mutex); // first reader locks out writers
    signal(mutex);

    /* reading is performed */

    wait(mutex);
    read_count--;
    if (read_count == 0) 
        signal(rw_mutex); // last reader allows writers
    signal(mutex);
} while (true);
```

#### C. The Dining-Philosophers Problem
*   **Shared Data:** `semaphore chopstick[5];` (initialized to 1).

**Philosopher $i$ Process:**
```c
do {
    wait(chopstick[i]);           // pick up left chopstick
    wait(chopstick[(i+1) % 5]);   // pick up right chopstick

    /* eat */

    signal(chopstick[i]);         // put down left
    signal(chopstick[(i+1) % 5]); // put down right

    /* think */
} while (true);
```
*(Note: This simple solution can lead to deadlock if all 5 philosophers pick up their left chopstick simultaneously).*

---

## Part B: Deadlock

### 1. System Model
A system has a finite number of resources (CPU cycles, memory space, files, I/O devices).
*   **Resource Types:** $R_1, R_2, ..., R_m$ (e.g., $R_1$ is printers, $R_2$ is tape drives).
*   Each resource type has $W_i$ identical instances.
*   A process must follow this sequence to use a resource: **Request $\rightarrow$ Use $\rightarrow$ Release**.

### 2. Deadlock Characterization
A **Deadlock** occurs when a set of processes are permanently blocked, waiting for an event (resource release) that can only be triggered by another blocked process in the set.

**The Four Necessary Conditions (ALL four must hold simultaneously):**
1.  **Mutual Exclusion:** At least one resource must be held in a non-sharable mode; only one process at a time can use the resource.
2.  **Hold and Wait:** A process must be holding at least one resource and waiting to acquire additional resources that are currently being held by other processes.
3.  **No Preemption:** Resources cannot be forcibly taken away; a resource can be released only voluntarily by the process holding it, after it has completed its task.
4.  **Circular Wait:** There exists a set $\{P_0, P_1, ..., P_n\}$ of waiting processes such that $P_0$ is waiting for a resource held by $P_1$, $P_1$ is waiting for $P_2$, ..., and $P_n$ is waiting for $P_0$.

### 3. Methods for Handling Deadlocks
1.  **Prevention/Avoidance:** Ensure the system never enters a deadlock state.
2.  **Detection and Recovery:** Allow the system to enter a deadlock state, detect it, and then recover.
3.  **Ignorance (Ostrich Algorithm):** Ignore the problem completely. Used by most modern operating systems (Linux, Windows) because deadlocks are rare and prevention/detection is computationally expensive.

### 4. Deadlock Prevention
Design the system so that at least one of the 4 necessary conditions can NEVER hold.
*   **Preventing Mutual Exclusion:** Hard to do. Some resources (like printers) are inherently non-sharable. Read-only files can be shared.
*   **Preventing Hold and Wait:**
    *   *Protocol 1:* Require a process to request and be allocated all its resources before it begins execution.
    *   *Protocol 2:* A process can request resources only when it has none.
    *   *Disadvantage:* Low resource utilization and starvation is possible.
*   **Preventing No Preemption:**
    *   If a process holding some resources requests another resource that cannot be immediately allocated to it, then all resources currently being held are preempted (released implicitly). The process will be restarted only when it can regain its old resources plus the new ones.
*   **Preventing Circular Wait:**
    *   Impose a **total ordering** of all resource types. Require that each process requests resources in strictly increasing order of enumeration.

### 5. Deadlock Avoidance
Requires that the OS be given **a priori information** about how resources will be requested. The OS dynamically examines the resource-allocation state to ensure a circular-wait condition can never exist.
*   **Safe State:** A state is safe if the system can allocate resources to each process (up to its declared maximum) in some order and still avoid a deadlock. This order is called a **Safe Sequence**.

#### Banker's Algorithm (For Multiple Instances of Resources)
Data structures required (where $n$ = number of processes, $m$ = number of resource types):
*   `Available[m]`: Available instances of each resource.
*   `Max[n][m]`: Maximum demand of each process.
*   `Allocation[n][m]`: Resources currently allocated to each process.
*   `Need[n][m]`: Remaining resource need of each process. **(Need = Max - Allocation)**

**Safety Algorithm (Is the system in a safe state?):**
```c
// 1. Initialization
int Work[m];
bool Finish[n];
for(int i = 0; i < m; i++) Work[i] = Available[i];
for(int i = 0; i < n; i++) Finish[i] = false;

// 2 & 3. Find a safe sequence
bool found;
do {
    found = false;
    for(int i = 0; i < n; i++) {
        // Find a process that can finish
        if (Finish[i] == false && Need[i] <= Work) { 
            Work = Work + Allocation[i]; // Reclaim its resources
            Finish[i] = true;
            found = true;
        }
    }
} while(found);

// 4. Check if safe
bool isSafe = true;
for(int i = 0; i < n; i++) {
    if(Finish[i] == false) {
        isSafe = false;
        break; // System is NOT in a safe state
    }
}
```

**Resource-Request Algorithm (Can a request be granted?):**
Let $Request_i$ be the request vector for process $P_i$.
```c
if (Request_i <= Need_i) {
    if (Request_i <= Available) {
        // Pretend to allocate requested resources
        Available = Available - Request_i;
        Allocation_i = Allocation_i + Request_i;
        Need_i = Need_i - Request_i;
        
        // Now run the Safety Algorithm!
        if (SafetyAlgorithm() == true) {
            // Grant the request
        } else {
            // Request cannot be granted. Restore old state.
            Available = Available + Request_i;
            Allocation_i = Allocation_i - Request_i;
            Need_i = Need_i + Request_i;
            // P_i must wait
        }
    } else {
        // P_i must wait, resources not available
    }
} else {
    // Error condition: process has exceeded its maximum claim
}
```

### 6. Deadlock Detection
If the system doesn't use prevention or avoidance, it must have a detection algorithm.
*   **Single Instance per Resource Type:** Maintain a **Wait-For Graph** (nodes are processes, directed edge $P_i \rightarrow P_j$ means $P_i$ is waiting for $P_j$). A deadlock exists *if and only if* there is a cycle in the graph. The system periodically invokes an algorithm to search for cycles.
*   **Multiple Instances:** Uses an algorithm similar to the Banker's Safety algorithm, checking if `Request_i <= Work` for unfinished processes.

### 7. Recovery from Deadlocks
Once a deadlock is detected, how do we break it?
*   **Process Termination:**
    *   *Abort all deadlocked processes:* Fast but expensive (all partial work is lost).
    *   *Abort one process at a time:* Abort a process, invoke detection algorithm. Repeat until cycle is broken. High overhead.
*   **Resource Preemption:**
    *   *Selecting a Victim:* Which resources and which processes are preempted? (Based on cost, e.g., how long the process has computed, how many resources it has).
    *   *Rollback:* Since the process lost a resource, it cannot continue normally. Roll back the process to a safe state and restart it from that state.
    *   *Starvation:* Ensure that the same process is not always picked as a victim. Typically include the number of rollbacks in the cost factor.

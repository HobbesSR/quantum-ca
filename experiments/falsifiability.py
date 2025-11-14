"""Run falsifiability experiments for the 7-qubit redundancy toy model.

This script implements the setup described in the accompanying research notes.
It prepares the 7-qubit state, applies the competing Z and X interactions, and
computes classical mutual informations for geometric and randomized 2-qubit
fragments.  The results cover the hypotheses H1 and H2 described in the notes.

Usage: run the module directly with Python 3.  No external dependencies are
required.  The script prints tables for both hypotheses.
"""
from __future__ import annotations

import itertools
import math
from dataclasses import dataclass
from typing import Callable, Dict, List, Sequence, Tuple


QUBIT_COUNT = 7
SYSTEM_QUBIT = 0
ENV_QUBITS = [1, 2, 3, 4, 5, 6]
BLOCKS = {
    "block0": [1, 2],
    "block1": [3, 4],
    "block2": [5, 6],
}

Gate = Tuple[Tuple[complex, complex], Tuple[complex, complex]]


@dataclass(frozen=True)
class ExperimentResult:
    theta_z: float
    theta_x: float
    i_z: Dict[str, float]
    i_x: Dict[str, float]
    i_z_random: Dict[str, float]
    i_x_random: Dict[str, float]


SQRT1_2 = 1 / math.sqrt(2)
HADAMARD: Gate = ((SQRT1_2, SQRT1_2), (SQRT1_2, -SQRT1_2))


def ry(theta: float) -> Gate:
    """Return the single-qubit Ry rotation matrix."""
    c = math.cos(theta / 2)
    s = math.sin(theta / 2)
    return ((c, -s), (s, c))


def apply_single_qubit_gate(state: List[complex], gate: Gate, qubit: int) -> List[complex]:
    dim = len(state)
    step = 1 << qubit
    period = step << 1
    result = state[:]
    for start in range(0, dim, period):
        for offset in range(step):
            i0 = start + offset
            i1 = i0 + step
            a0 = state[i0]
            a1 = state[i1]
            result[i0] = gate[0][0] * a0 + gate[0][1] * a1
            result[i1] = gate[1][0] * a0 + gate[1][1] * a1
    return result


def apply_controlled_gate(
    state: List[complex], control: int, target: int, gate: Gate
) -> List[complex]:
    dim = len(state)
    control_mask = 1 << control
    target_mask = 1 << target
    result = state[:]
    for index in range(dim):
        if (index & control_mask) and not (index & target_mask):
            i0 = index
            i1 = index | target_mask
            a0 = state[i0]
            a1 = state[i1]
            result[i0] = gate[0][0] * a0 + gate[0][1] * a1
            result[i1] = gate[1][0] * a0 + gate[1][1] * a1
    return result


def initial_state() -> List[complex]:
    """Return |+>_S tensor |000000>_E."""
    state = [0j] * (1 << QUBIT_COUNT)
    norm = SQRT1_2
    state[0] = complex(norm, 0.0)
    state[1 << SYSTEM_QUBIT] = complex(norm, 0.0)
    return state


def apply_z_coupling(state: List[complex], theta_z: float) -> List[complex]:
    gate = ry(theta_z)
    result = state
    for qubit in BLOCKS["block0"]:
        result = apply_controlled_gate(result, SYSTEM_QUBIT, qubit, gate)
    return result


def apply_x_coupling(state: List[complex], theta_x: float) -> List[complex]:
    if math.isclose(theta_x, 0.0, abs_tol=1e-12):
        return state
    gate = ry(theta_x)
    result = apply_single_qubit_gate(state, HADAMARD, SYSTEM_QUBIT)
    for qubit in BLOCKS["block2"]:
        result = apply_controlled_gate(result, SYSTEM_QUBIT, qubit, gate)
    result = apply_single_qubit_gate(result, HADAMARD, SYSTEM_QUBIT)
    return result


def full_state(theta_z: float, theta_x: float) -> List[complex]:
    state = initial_state()
    state = apply_z_coupling(state, theta_z)
    state = apply_x_coupling(state, theta_x)
    # The gates are unitary, but floating point accumulation can introduce
    # slight deviations from unit norm.  Renormalize defensively so that the
    # downstream probability calculations never see a negative value from
    # rounding error.
    norm = math.sqrt(sum(a.real * a.real + a.imag * a.imag for a in state))
    if not math.isclose(norm, 1.0, rel_tol=1e-12, abs_tol=1e-12):
        state = [amp / norm for amp in state]
    return state


def apply_basis_transforms(state: List[complex], basis_ops: Dict[int, Gate]) -> List[complex]:
    result = state
    for qubit, gate in basis_ops.items():
        result = apply_single_qubit_gate(result, gate, qubit)
    return result


def joint_distribution(state: List[complex], measured_qubits: Sequence[int]) -> List[float]:
    outcome_count = 1 << len(measured_qubits)
    probs = [0.0] * outcome_count
    for index, amp in enumerate(state):
        prob = amp.real * amp.real + amp.imag * amp.imag
        if prob == 0.0:
            continue
        outcome = 0
        for pos, qubit in enumerate(measured_qubits):
            if index & (1 << qubit):
                outcome |= 1 << pos
        probs[outcome] += prob
    return probs


def mutual_information_from_distribution(joint: List[float]) -> float:
    p_s = [0.0, 0.0]
    block_states = len(joint) // 2
    p_b = [0.0 for _ in range(block_states)]
    for idx, prob in enumerate(joint):
        s = idx & 1
        b = idx >> 1
        p_s[s] += prob
        p_b[b] += prob
    mi = 0.0
    for idx, prob in enumerate(joint):
        if prob <= 0.0:
            continue
        s = idx & 1
        b = idx >> 1
        denom = p_s[s] * p_b[b]
        if denom <= 0.0:
            continue
        mi += prob * math.log2(prob / denom)
    return mi


def block_mutual_information(
    state: List[complex],
    block: Sequence[int],
    basis_ops: Dict[int, Gate],
) -> float:
    transformed = apply_basis_transforms(state, basis_ops)
    measured = [SYSTEM_QUBIT, *block]
    joint = joint_distribution(transformed, measured)
    return mutual_information_from_distribution(joint)


def mutual_information_table(
    state: List[complex], basis_map_factory: Callable[[Sequence[int]], Dict[int, Gate]]
) -> Dict[str, float]:
    return {
        name: block_mutual_information(state, qubits, basis_map_factory(qubits))
        for name, qubits in BLOCKS.items()
    }


def random_block_tables(
    state: List[complex], basis_map_factory: Callable[[Sequence[int]], Dict[int, Gate]]
) -> Dict[str, float]:
    totals = {"block0": 0.0, "block1": 0.0, "block2": 0.0}
    permutations = list(itertools.permutations(ENV_QUBITS))
    for perm in permutations:
        blocks = {
            "block0": [perm[0], perm[1]],
            "block1": [perm[2], perm[3]],
            "block2": [perm[4], perm[5]],
        }
        for name, qubits in blocks.items():
            basis_ops = basis_map_factory(qubits)
            mi = block_mutual_information(state, qubits, basis_ops)
            totals[name] += mi
    count = float(len(permutations))
    return {name: value / count for name, value in totals.items()}


def run_experiment(theta_z: float, theta_x: float) -> ExperimentResult:
    state = full_state(theta_z, theta_x)

    def z_basis(_: Sequence[int]) -> Dict[int, Gate]:
        return {}

    def x_basis(qubits: Sequence[int]) -> Dict[int, Gate]:
        mapping: Dict[int, Gate] = {SYSTEM_QUBIT: HADAMARD}
        for qubit in qubits:
            mapping[qubit] = HADAMARD
        return mapping

    i_z = mutual_information_table(state, z_basis)
    i_x = mutual_information_table(state, x_basis)
    i_z_rand = random_block_tables(state, z_basis)
    i_x_rand = random_block_tables(state, x_basis)

    return ExperimentResult(theta_z, theta_x, i_z, i_x, i_z_rand, i_x_rand)


def delta_geometry(result: ExperimentResult, pointer: str) -> float:
    if pointer == "Z":
        return result.i_z["block0"] - result.i_z["block2"]
    if pointer == "X":
        return result.i_x["block2"] - result.i_x["block0"]
    raise ValueError(f"Unknown pointer {pointer}")


def delta_random(result: ExperimentResult, pointer: str) -> float:
    if pointer == "Z":
        return result.i_z_random["block0"] - result.i_z_random["block2"]
    if pointer == "X":
        return result.i_x_random["block2"] - result.i_x_random["block0"]
    raise ValueError(f"Unknown pointer {pointer}")


def redundancy(result: ExperimentResult, pointer: str) -> float:
    if pointer == "Z":
        return max(result.i_z.values())
    if pointer == "X":
        return max(result.i_x.values())
    raise ValueError(f"Unknown pointer {pointer}")


def print_h1_results(result: ExperimentResult, label: str) -> None:
    print(f"\nH1 – {label}")
    print(f"theta_Z={result.theta_z:.3f}, theta_X={result.theta_x:.3f}")
    print("I_Z geom:", result.i_z)
    print("I_Z rand:", result.i_z_random)
    print("I_X geom:", result.i_x)
    print("I_X rand:", result.i_x_random)
    print(
        f"Delta_Z geom={delta_geometry(result, 'Z'):.4f}, rand={delta_random(result, 'Z'):.4f}"
    )
    print(
        f"Delta_X geom={delta_geometry(result, 'X'):.4f}, rand={delta_random(result, 'X'):.4f}"
    )


def print_h2_results(single: ExperimentResult, diagonal: ExperimentResult, label: str) -> None:
    print(f"\nH2 – θ={label}")
    print(
        f"R_Z single={redundancy(single, 'Z'):.4f}, diag={redundancy(diagonal, 'Z'):.4f}, "
        f"margin={redundancy(single, 'Z') - redundancy(diagonal, 'Z'):.4f}"
    )
    print(
        f"R_X single={redundancy(single, 'X'):.4f}, diag={redundancy(diagonal, 'X'):.4f}, "
        f"margin={redundancy(single, 'X') - redundancy(diagonal, 'X'):.4f}"
    )


def main() -> None:
    # Sanity check: with no couplings active, every mutual information entry
    # should be numerically zero.  This guards against wiring mistakes in the
    # measurement bookkeeping.
    uncoupled = run_experiment(0.0, 0.0)
    zero_tol = 1e-10
    assert all(abs(v) < zero_tol for v in uncoupled.i_z.values())
    assert all(abs(v) < zero_tol for v in uncoupled.i_x.values())

    dominated_z = run_experiment(math.pi / 4, math.pi / 12)
    dominated_x = run_experiment(math.pi / 12, math.pi / 4)

    print_h1_results(dominated_z, "Z-dominated regime")
    print_h1_results(dominated_x, "X-dominated regime")

    for theta in (math.pi / 6, math.pi / 4):
        single_z = run_experiment(theta, 0.0)
        single_x = run_experiment(0.0, theta)
        diagonal = run_experiment(theta, theta)
        print_h2_results(single_z, diagonal, f"Z edge {theta:.3f}")
        print_h2_results(single_x, diagonal, f"X edge {theta:.3f}")


if __name__ == "__main__":
    main()
